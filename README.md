# 特典会記録帳

既存のイベントカレンダー `https://hanazonoreika.github.io/member-event-calendar/data/events.json` を読み込み、イベントごとの衣装・ポーズ・会話・支出を記録する静的サイトです。

## GitHub Pagesへの公開手順

1. GitHubで新しい公開リポジトリ `tokutenkai-record` を作成します。
2. このフォルダ内の `index.html`、`style.css`、`app.js`、`README.md` をリポジトリ直下にアップロードします。
3. リポジトリの **Settings → Pages** を開き、Build and deployment の Source を **Deploy from a branch** にします。
4. Branch を `main`、folder を `/(root)` にして Save します。
5. 数分後、`https://hanazonoreika.github.io/tokutenkai-record/` で開きます。

## 保存・プライバシー

- 記録は利用中のブラウザの `localStorage` に保存されます。端末間・ブラウザ間では自動同期されません。
- 「バックアップを書き出す」でJSON保存、「バックアップを復元」で読み戻しできます。
- マル秘モードは画面上の金額表示を隠すだけで、暗号化やログイン機能ではありません。
- 記録データはGitHubへ送信しません。イベント一覧だけを公開JSONから取得します。

## 連携先を変更する場合

`app.js` 冒頭の `EVENTS_URL` を、公開されているイベントJSONのURLに変更してください。
