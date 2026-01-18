import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import '../models/slot.dart';

class ApiService {
  // Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator
  // Update this based on where you run (e.g. your local IP if testing on real device)
  // For Android Emulator, use 'http://10.0.2.2:3000'
  // For iOS/Web, use 'http://localhost:3000'
  // For Railway, use your Railway URL
  static const String baseUrl = 'http://10.0.2.2:3000'; 
  
  static const String testDeptId = 'dept_test_01'; // Mock
  static const Uuid uuid = Uuid();

  Future<Map<String, dynamic>?> login(String phone) async {
    final uri = Uri.parse('$baseUrl/hospital/login');
    try {
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone': phone}),
      );
      if (response.statusCode == 201 || response.statusCode == 200) {
        if (response.body.isEmpty || response.body == 'null') return null;
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print("[ApiService] Login Error: $e");
      return null;
    }
  }

  Future<Map<String, dynamic>> register(String name, String phone, String birthDate, String gender) async {
    final uri = Uri.parse('$baseUrl/hospital/register');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'phone': phone,
        'birthDate': birthDate,
        'gender': gender,
      }),
    );
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to register');
    }
  }

  Future<List<Slot>> getSlots(DateTime date) async {
    final dateStr = date.toIso8601String().split('T')[0]; // YYYY-MM-DD
    final uri = Uri.parse('$baseUrl/booking/slots?departmentId=$testDeptId&date=$dateStr');
    
    final response = await http.get(uri);
    
    if (response.statusCode == 200) {
      final List<dynamic> body = jsonDecode(response.body);
      return body.map((e) => Slot.fromJson(e)).toList();
    } else {
      throw Exception('Failed to load slots');
    }
  }

  Future<bool> bookSlot(String slotId, String patientId) async {
    final uri = Uri.parse('$baseUrl/booking/appointments');
    final idempotencyKey = uuid.v4();
    
    try {
      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempotencyKey,
        },
        body: jsonEncode({
          'slotId': slotId,
          'patientId': patientId,
        }),
      );
      
      return response.statusCode == 201;
    } catch (e) {
      print(e);
      return false;
    }
  }
}
