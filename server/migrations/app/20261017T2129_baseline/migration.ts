#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/f8a7a006f2d6b74d09976e63b94ba54ba99a5c77c4863db111e09d0904741788/contract';
import endContract from '../../snapshots/f8a7a006f2d6b74d09976e63b94ba54ba99a5c77c4863db111e09d0904741788/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'books',
        columns: [
          col('author', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('cover_image_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('genre', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('read_status', 'text', {
            notNull: true,
            default: lit('want to read'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'books_pkey' }),
          checkExpression(
            'books_read_status_check',
            "(read_status = ANY (ARRAY['want to read'::text, 'reading'::text, 'read'::text]))",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ratings',
        columns: [
          col('book_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('book_review_text', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('date_finished', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rating', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'ratings_pkey' }),
          checkExpression('ratings_rating_check', '((rating >= 1) AND (rating <= 5))'),
        ],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ratings',
        foreignKey: {
          name: 'ratings_book_id_fkey',
          columns: ['book_id'],
          references: { schema: 'public', table: 'books', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
