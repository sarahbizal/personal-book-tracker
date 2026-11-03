#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/e38cb7bc8f8faf96bfebfb9669f5ae73fcb2dae953246d4d76e436b6b660cc47/contract';
import endContract from '../../snapshots/e38cb7bc8f8faf96bfebfb9669f5ae73fcb2dae953246d4d76e436b6b660cc47/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f8a7a006f2d6b74d09976e63b94ba54ba99a5c77c4863db111e09d0904741788/contract';
import startContract from '../../snapshots/f8a7a006f2d6b74d09976e63b94ba54ba99a5c77c4863db111e09d0904741788/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'sessions',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expires_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('token_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'sessions_pkey' })],
      }),
      this.addUnique({
        schema: 'public',
        table: 'sessions',
        constraint: 'sessions_token_hash_key',
        columns: ['token_hash'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
