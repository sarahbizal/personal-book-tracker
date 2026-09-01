*How to Make Schema Changes*
1. Make the required changes in server/schema.sql and save
2. Apply the changes directly to the live database with psql (example: `ALTER TABLE books RENAME COLUMN example TO example_1;`). 
3. Prisma will need the contract regenerated with `npx prisma@latest contract infer --output ./prisma/contract.prisma`
4. Make sure to review the updated contract 
5. Run `npx prisma@latest contract emit` so the runtime and query APIs are aligned with the contract
6. Run `npx prisma@latest db sign` to record that the live database matches the emitted contract
