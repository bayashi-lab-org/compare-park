# 再始動 第1週の変更と反映手順

## 変更内容

- 二輪・駐輪施設を乗用車の一覧、検索、判定、周辺候補、件数、サイトマップから除外。元のDB行は削除しない。
- リパーク収集時の住所抽出を修正。CSVでは対象外6施設を除外し、宮下公園の住所2件を訂正。取り込み時にも再混入を検出する。
- アルファード40系の既知の諸元誤り4件を訂正する、対象限定・再実行可能なDBスクリプトを用意。旧世代には適用しない。
- アルファード、WR-V、幅・高さ記事などの既知の誤記を訂正。年式や条件を省いた一律の入庫保証、制作メモ、出典未確認の割合を修正。全車種の最新諸元検証は次の作業に残る。
- MDX本文の内部リンクとcarSlugを検査し、未登録URLを訂正。全85記事を検査できるコマンドを追加。
- 現在地取得を同一オリジンで許可し、取得失敗時の案内を変更。
- 実際の全高より低い制限値を案内していた地域×車種ページの説明文を修正。
- 記事CTA、グレード選択、判定開始・完了、施設公式サイトクリックの計測を追加。
- サイトマップの/searchを除去し、駐車場のlastmodをDB更新日時に変更。他ページのlastmod改善は別作業。

## 検証

```sh
npm ci
npm test
npm run check:content
npm run lint
npx tsc --noEmit
npm run build
node --import tsx src/scripts/import-csv.ts data/all-parking.csv --dry-run
```

自動テストは一時SQLite DBを使う。本番への接続・書き込みを行わない。誤値の訂正、一括ロールバック、再実行、旧世代維持、公開検索経路の除外、住所抽出、計測キューを検証する。

リンク検査はMDX本文のMarkdown内部リンクとcarSlugが対象。車種はGit管理のseedをカタログとして照合するため、新車種追加時はseedも更新する。外部リンクの稼働、記事内の全数値、動的生成される全リンクの正確性を保証する検査ではない。

2026-09-20の検証結果：テスト10件、記事検査85件、型検査、ビルドが成功。ESLintはエラー0、既存の未使用変数等の警告25件。ブラウザで記事CTA、判定開始→完了、公式リンクのイベントを捕捉し、各1回と確認。現在地は権限ポリシー許可を確認し、成功・拒否コールバックを模擬して遷移・エラー後の再操作を確認した。実端末のGPS取得は未検証。

二輪施設の直URLではnotFound画面・noindex・判定フォームなしを確認。Next.jsのストリーミング応答ではHTTP 200となる場合がある。

## 本番DBへの適用

この文書を追加した時点では本番DBは未変更。住所2件、寸法4件のdry-runを確認済み。CSV全件再投入やdb:seedを本番に実行しない。

1. この変更をGitへcommit/pushし、反映コミットと本番リリースの承認を確認する。
2. 承認されたコミットのスクリプトを使用してdry-run結果を保存する。`.env.production`と結果の保管先はGit管理外にする。

   ```sh
   node --env-file=.env.production --import tsx src/scripts/correct-restart-data.ts
   ```

3. 対象が下記6件であることを確認し、適用する。既知の旧値と一致しない場合は全変更をロールバックして停止する。

   ```sh
   node --env-file=.env.production --import tsx src/scripts/correct-restart-data.ts --apply
   node --env-file=.env.production --import tsx src/scripts/correct-restart-data.ts
   ```

4. 再実行結果が変更0件となることを確認する。
5. 本番ブランチへ反映し、新しいDB値でVercelのビルドを行う。駐車場はISRが7日なので、DBだけ直して待つ運用にはしない。
6. 本番の住所2件、対象外施設、アルファードの該当グレード、主要記事、サイトマップ、計測を確認する。

| 対象 | 変更 |
|---|---|
| repark-rep0024655 | 住所から案内文を除去 |
| repark-rep0024657 | 住所から案内文を除去 |
| 40系 Z ガソリン 4WD | 2,130 → 2,120kg |
| 40系 Executive Lounge HV 2WD | 2,090 → 2,230kg |
| 40系 Executive Lounge HV 4WD | 2,160 → 2,290kg |
| 40系 Z PHEV 4WD | 2,290 → 2,440kg、1,935 → 1,945mm |

諸元の根拠：[トヨタ公式2026年6月主要諸元表](https://toyota.jp/pages/contents/alphard/004_p_001/pdf/alphard_spec_202606.pdf)。標準装備時の仕様。オプション・過去年式への一律適用はしない。

コードの不具合時はGitのrevertで復旧する。確認済みの正しい諸元・住所を誤値へ戻すことは、コード復旧の前提にしない。

## 計測の読み方

| イベント | 発生条件 | 主なパラメータ |
|---|---|---|
| article_cta_click | 記事内の車種・施設への個別リンク | article_slug, target_type, target_slug |
| car_detail_click | ホームで車種だけ選んで詳細へ移動 | source, car_slug |
| car_trim_select | 車種ページで世代・グレードを変更 | car_slug, generation_id, trim_id |
| parking_check_start | ホームで両方選択して判定、または施設内で車種選択 | source, car_slug, parking_slug |
| parking_check_complete | 施設内で1項目以上の比較結果が表示 | car_slug, parking_slug, result, dimension_basis, compared_dimensions |
| parking_official_click | 施設の公式サイトリンクをクリック | parking_slug |

完了イベントは登録された代表グレードによる判定を示す。`dimension_basis=representative`を送る。4項目全て比較した件数だけを使う場合は`compared_dimensions=4`で絞る。契約・予約の成果とは区別する。直リンクで結果を開いた場合など、開始イベントなしで完了する経路もある。

追加したイベントのパラメータに座標・住所・自由入力・URLクエリを入れない。これは既存の自動ページビュー等を含むサイト全体の個人情報監査を意味しない。

本番受信はデプロイ後にGA4リアルタイム/DebugViewで確認する。GA4の管理画面でパラメータ別に集計する際はイベントスコープのカスタムディメンション登録が必要。イベント名単位の集計は登録なしで利用できる。記事ページを起点にしたファネルは利用者/セッション単位で評価し、イベント総数の割り算だけで離脱率を断定しない。

## 次の作業

流入上位記事を年式・型式・グレード単位で再検証する。代表寸法による簡易判定から年式・グレードを引き継ぐ導線へ改善し、スマホの判定フォームの配置を見直す。Search Console/GA4の実測は公開リポジトリには格納しない。
