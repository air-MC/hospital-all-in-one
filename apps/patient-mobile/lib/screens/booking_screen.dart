import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/slot.dart';
import '../services/api_service.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final ApiService _api = ApiService();
  DateTime _selectedDate = DateTime.now();
  List<Slot> _slots = [];
  bool _isLoading = false;

  // Mock Patient
  final String _patientId = "patient_mobile_demo";

  @override
  void initState() {
    super.initState();
    _fetchSlots();
  }

  Future<void> _fetchSlots() async {
    setState(() => _isLoading = true);
    try {
      final slots = await _api.getSlots(_selectedDate);
      setState(() => _slots = slots);
    } catch (e) {
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error loading slots: $e")),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleBook(Slot slot) async {
    final success = await _api.bookSlot(slot.id, _patientId);
    if (success) {
      if (mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text("Success"),
            content: const Text("Appointment Confirmed!"),
            actions: [
              TextButton(
                 onPressed: () { 
                   Navigator.pop(context);
                   _fetchSlots(); // Refresh
                 }, 
                 child: const Text("OK")
              )
            ],
          )
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Booking Failed (Slot Full or Error)")),
        );
        _fetchSlots();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Book Appointment"),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Date Selector
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () {
                    setState(() => _selectedDate = _selectedDate.subtract(const Duration(days: 1)));
                    _fetchSlots();
                  },
                ),
                Text(
                  DateFormat("EEE, MMM d").format(_selectedDate),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () {
                    setState(() => _selectedDate = _selectedDate.add(const Duration(days: 1)));
                    _fetchSlots();
                  },
                ),
              ],
            ),
          ),
          
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : _slots.isEmpty
                ? const Center(child: Text("No slots available"))
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      childAspectRatio: 1.5,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                    ),
                    itemCount: _slots.length,
                    itemBuilder: (context, index) {
                      final slot = _slots[index];
                      final isFull = slot.isFull;
                      final timeStr = DateFormat("HH:mm").format(DateTime.parse(slot.startDateTime));

                      return InkWell(
                        onTap: isFull ? null : () => _handleBook(slot),
                        child: Container(
                          decoration: BoxDecoration(
                            color: isFull ? Colors.grey[200] : Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isFull ? Colors.grey[300]! : Colors.teal.withOpacity(0.5),
                              width: 2,
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                timeStr,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: isFull ? Colors.grey : Colors.teal[800],
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                isFull ? "FULL" : "${slot.bookedCount}/${slot.capacity}",
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isFull ? Colors.red : Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
