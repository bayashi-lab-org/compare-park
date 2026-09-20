# DEPLOY.md — compare-park / トメピタ

生成日: 2026-09-20。pj-deployによる実地確認。手順変更時はGitへcommit/pushする。

## 方式

VercelのGitHub連携。リポジトリは `bayashi-lab-org/compare-park`、実際のVercelプロジェクトは `lovehotel-project/tomepita`。
ローカルの `.vercel/project.json` に旧名称 `compare-park` が残っている場合がある。Vercel CLIの状態確認では実プロジェクトとscopeを指定する。

## 環境とブランチ

| 環境 | ブランチ | トリガー | 確認方法 | URL |
|---|---|---|---|---|
| 本番 | main | mainへのpush | GitHubのVercelチェック、Vercel Ready、本番URLの応答・内容 | https://www.tomepita.com |
| Preview | 作業ブランチ | 作業ブランチへのpush | PRのVercelチェック、認証付きプレビュー | Vercelが生成するURL |

2026-09-20、PR #1をmainへ反映し、DB6件を修正して本番公開する方針についてユーザー承認済み。
環境指定がない場合の恒常的なデフォルトは未設定。今後は依頼・セッション内の承認範囲に従う。

ソースをローカルで修正してGit経由で反映する。サーバー直接修正やSSM経由の修正は行わない。通常の本番反映でCLIからローカル資源を直接アップロードしない。

## デプロイ前チェック

- 未コミットの変更と、リモートmain以降の差分を確認。
- `npm test`、`npm run check:content`、`npm run lint`、`npx tsc --noEmit`、`npm run build`。
- 検証済みの同一ソースを反映する場合は、その検証結果を利用する。
- DB修正がある場合はGit管理された対象限定スクリプトで変更前を保存し、適用後に検証する。
- 初週の6件訂正は [docs/restart-week-one.md](docs/restart-week-one.md) に記載。CSV全件再投入や `db:seed` は本番で実行しない。
- 駐車場のISRは7日。データ訂正後に新しい値でビルドする。

## 設定と確認

- 関数のリージョンは `vercel.json` の `hnd1`。ビルド実行拠点とは別。
- 本番の環境変数: `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`。
- 秘密値・認証ファイル・分析の実測値をGitへ格納しない。
- Previewは環境変数が別設定。初週の確認用DB接続は作業ブランチ専用に設定。本番DBを読み取るため、PreviewからDB修正を行わない。
- 約9,300ページを静的生成するため、Vercelでのビルドは10分程度かかる場合がある。

```sh
vercel ls tomepita --scope lovehotel-project
vercel inspect <deployment-id> --logs --scope lovehotel-project
gh pr checks <PR番号>
```

## 公開後の検証

トップ、変更記事、駐車場、車種の各URLでHTTP応答と変更内容を確認する。サイトマップ、対象外施設のnoindex、現在地取得のPermissions-Policyも確認する。
計測を変更した場合はブラウザからのイベント送信とGA4受信を確認する。カスタム集計項目の登録にはGA4編集権限が必要。

## ロールバック

ソースの不具合は対象コミットをGitでrevertし、mainへpushして反映する。
検証済みの正しい住所・諸元を誤値へ戻すことは、コード復旧の前提にしない。
DB側に問題がある場合は保存済みの変更前データと現値を照合し、対象限定の復旧手順を作る。
