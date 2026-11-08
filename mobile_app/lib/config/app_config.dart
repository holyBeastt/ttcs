class AppConfig {
  const AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://corymbose-tessie-guiltlessly.ngrok-free.dev',
  );
}
