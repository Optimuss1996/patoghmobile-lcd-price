-- این را یک بار در Supabase > SQL Editor اجرا کن (قبل از آپلود کد جدید)
alter table "list-lcd"
  add column if not exists in_stock boolean not null default true;
