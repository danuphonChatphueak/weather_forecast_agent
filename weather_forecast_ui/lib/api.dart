import 'dart:convert';
import 'package:http/browser_client.dart';

class WeatherApi {
  final BrowserClient _client = BrowserClient()..withCredentials = true;

  final String baseUrl = 'https://weatherforecastagent-service-fyhtapbjhagnhye7.malaysiawest-01.azurewebsites.net/';
  Future<Map<String, dynamic>> sendMessage({
    required String message,
    String? sessionId,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/forecast'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'message': message,

        'sessionId': ?sessionId,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception(
        'API request failed: ${response.statusCode}\n'
        'Server response: ${response.body}',
      );
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;

    return data;
  }

  void dispose() {
    _client.close();
  }
}
