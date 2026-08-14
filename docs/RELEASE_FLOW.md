# 公開の流れ（グンギ）

ブラウザ対局の非公式ファン再構成。ストア申請はしない。公開HPのみ。

## 公開先

| 先 | URL | 状態 |
| --- | --- | --- |
| Web | https://gungi-iota.vercel.app | 公開済み |
| ポートフォリオ | https://ymd-portfolio-site.pages.dev/ | 公開URL確定後に掲載 |
| ストア法務ハブ | 対象外 | Webのみ |

## エージェント

1. `npm run build`（スモーク）
2. `npx vercel --prod --yes`
3. `ymd-portfolio` へ `publish-app-listing.mjs --portfolio-only`
4. 画面確認はローカル Playwright / エージェント用ブラウザのみ

## 人間必須

なし（Vercel 既存ログインで公開可）。Cloudflare のポートフォリオ本番反映はトークン再発行待ち。
