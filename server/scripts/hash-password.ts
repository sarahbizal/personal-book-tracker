import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/password.js";

const CTRL_C = "\u0003";
const CTRL_D = "\u0004";
const ESCAPE = "\u001b";
const BACKSPACE = ["\u007f", "\b"];

//Restore the terminal if the script is killed mid-prompt
process.once("exit", () => {
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
});
process.once("SIGTERM", () => process.exit(143));
process.once("SIGHUP", () => process.exit(129));

//Prompts go to stderr so stdout carries only the hash
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const { stdin, stderr } = process;
    stderr.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();

    let input = "";
    //Arrow keys send escape sequences like ESC [ D
    let escape: "none" | "start" | "sequence" = "none";
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stderr.write("\n");
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (escape === "start") {
          escape = char === "[" || char === "O" ? "sequence" : "none";
          continue;
        }
        if (escape === "sequence") {
          //The sequence ends at its first letter or "~"
          if (char >= "@" && char <= "~") escape = "none";
          continue;
        }
        if (char === "\r" || char === "\n") {
          //Anything after Enter in the same chunk (like a pasted second line) is dropped on purpose
          finish();
          resolve(input);
          return;
        }
        if (char === CTRL_C || char === CTRL_D) {
          //Raw mode swallows these signals, so cancel manually
          finish();
          process.exit(130);
        }
        if (char === ESCAPE) {
          escape = "start";
          continue;
        }
        if (BACKSPACE.includes(char)) {
          input = [...input].slice(0, -1).join("");
        } else if (char >= " ") {
          input += char;
        }
      }
    };
    stdin.on("data", onData);
  });
}

if (!process.stdin.isTTY) {
  console.error("Run this in a terminal so the password can be typed without echoing.");
  process.exit(1);
}

const password = await promptHidden("Password: ");
if ([...password.normalize("NFC")].length < MIN_PASSWORD_LENGTH) {
  console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  process.exit(1);
}
const confirmation = await promptHidden("Confirm password: ");
if (password !== confirmation) {
  console.error("Passwords don't match.");
  process.exit(1);
}

console.log(await hashPassword(password));
