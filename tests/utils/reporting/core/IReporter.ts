/**
 * レポート生成用の共通IF
 */
export interface IReporter {
  generate(): void;
}

/**
 * テストログ記録用IF
 */
export interface ITestLogger {
  /**
   * ログメッセージを記録
   * @param message ログメッセージ
   */
  log(message: string): void;

  /**
   * 記録したログを永続化
   * @param testName テスト名(ファイル名生成等に利用)
   */
  save(testName: string): void;

  /**
   * ログをクリア
   */
  clear(): void;
}
