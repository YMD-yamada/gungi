# Telemetry logs

対局の軽量ログはここに溜まります（アプリUIには出しません）。

- ファイル: `telemetry.jsonl`（1行1イベントのバッチ）
- 書き込み: ローカルの `npm run dev` / `npm run preview` 時に `POST /api/log`
- 本番(Vercel): `api/log.ts` が受理し、プラットフォームのランタイムログに要約のみ

チャットから解析依頼されたときは、エージェントがこの JSONL を読んで分析します。
