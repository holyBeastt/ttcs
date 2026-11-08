import 'package:dio/dio.dart';

import '../models/auth_session.dart';
import 'token_store.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;
  final String? code;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({required String baseUrl, required this.tokenStore}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl.replaceFirst(RegExp(r'/$'), ''),
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        headers: const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final session = await tokenStore.read();
          if (session != null && session.accessToken.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer ${session.accessToken}';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final request = error.requestOptions;
          final isAuthRequest =
              request.path == '/login' ||
              request.path.endsWith('/refresh') ||
              request.extra['authRetry'] == true;
          if (error.response?.statusCode == 401 && !isAuthRequest) {
            final refreshed = await _refreshInFlight();
            if (refreshed != null) {
              request.extra['authRetry'] = true;
              request.headers['Authorization'] =
                  'Bearer ${refreshed.accessToken}';
              try {
                final response = await _dio.fetch(request);
                return handler.resolve(response);
              } on DioException catch (retryError) {
                return handler.next(retryError);
              }
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  late final Dio _dio;
  final TokenStore tokenStore;
  Future<AuthSession?>? _refreshing;

  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Future<Response<dynamic>> post(String path, {Object? data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Future<Response<dynamic>> patch(String path, {Object? data}) async {
    try {
      return await _dio.patch(path, data: data);
    } on DioException catch (error) {
      throw _toApiException(error);
    }
  }

  Future<AuthSession?> _refreshInFlight() {
    return _refreshing ??= _refresh().whenComplete(() => _refreshing = null);
  }

  Future<AuthSession?> _refresh() async {
    final current = await tokenStore.read();
    if (current == null || current.refreshToken.isEmpty) return null;

    try {
      final response =
          await Dio(
            BaseOptions(
              baseUrl: _dio.options.baseUrl,
              connectTimeout: _dio.options.connectTimeout,
              receiveTimeout: _dio.options.receiveTimeout,
              headers: _dio.options.headers,
            ),
          ).post(
            '/api/mobile/v1/refresh',
            data: {'refreshToken': current.refreshToken},
          );
      final body = _map(response.data);
      final accessToken = body['accessToken']?.toString();
      if (accessToken == null || accessToken.isEmpty) return null;
      final refreshed = current.copyWith(accessToken: accessToken);
      await tokenStore.save(refreshed);
      return refreshed;
    } on DioException {
      await tokenStore.clear();
      return null;
    }
  }

  ApiException _toApiException(DioException error) {
    final status = error.response?.statusCode;
    final body = error.response?.data;
    final map = body is Map ? Map<String, dynamic>.from(body) : const {};
    final code = map['code']?.toString();
    final message =
        map['message']?.toString() ??
        switch (status) {
          401 => 'Phiên đăng nhập đã hết hạn.',
          403 => 'Bạn không có quyền xem dữ liệu này.',
          404 => 'Không tìm thấy dữ liệu cho bộ lọc hiện tại.',
          423 => 'Năm học chưa được khóa.',
          _ => 'Không thể kết nối máy chủ. Vui lòng thử lại.',
        };
    return ApiException(message, statusCode: status, code: code);
  }

  static Map<String, dynamic> _map(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }
}
