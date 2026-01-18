import 'package:flutter/material.dart';
import 'screens/booking_screen.dart';

void main() {
  runApp(const HospitalPatientApp());
}

class HospitalPatientApp extends StatelessWidget {
  const HospitalPatientApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hospital Patient App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const PatientLoginPage(),
    );
  }
}

class PatientLoginPage extends StatefulWidget {
  const PatientLoginPage({super.key});

  @override
  State<PatientLoginPage> createState() => _PatientLoginPageState();
}

class _PatientLoginPageState extends State<PatientLoginPage> {
  final TextEditingController _phoneController = TextEditingController();
  final ApiService _api = ApiService();
  bool _isLoading = false;
  String? _error;

  Future<void> _handleLogin() async {
    final phone = _phoneController.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (phone.length < 10) {
      setState(() => _error = "올바른 휴대전화 번호를 입력해주세요.");
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final patient = await _api.login(phone);
      if (patient != null) {
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const BookingScreen()),
          );
        }
      } else {
        setState(() => _error = "환자 정보를 찾을 수 없습니다. (테스트용: 01012345678)");
      }
    } catch (e) {
      setState(() => _error = "로그인 중 오류가 발생했습니다.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.teal.shade50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.local_hospital_rounded, size: 64, color: Colors.teal),
              ),
              const SizedBox(height: 32),
              const Text(
                "Hospital All-in-One",
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              const Text(
                "가장 스마트한 환자 동행 서비스",
                style: TextStyle(fontSize: 14, color: Colors.black54),
              ),
              const SizedBox(height: 48),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: "휴대전화 번호",
                  hintText: "01012345678",
                  prefixIcon: const Icon(Icons.phone),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  filled: true,
                  fillColor: Colors.white,
                ),
                onSubmitted: (_) => _handleLogin(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 13)),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  onPressed: _isLoading ? null : _handleLogin,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.teal,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isLoading 
                    ? const SizedBox(width: 24, h: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3))
                    : const Text("시작하기", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
