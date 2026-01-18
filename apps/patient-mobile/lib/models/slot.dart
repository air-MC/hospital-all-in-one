class Slot {
  final String id;
  final String startDateTime;
  final String status; // OPEN, FULL, CLOSED
  final int bookedCount;
  final int capacity;

  Slot({
    required this.id,
    required this.startDateTime,
    required this.status,
    required this.bookedCount,
    required this.capacity,
  });

  factory Slot.fromJson(Map<String, dynamic> json) {
    return Slot(
      id: json['id'],
      startDateTime: json['startDateTime'],
      status: json['status'],
      bookedCount: json['bookedCount'],
      capacity: json['capacity'],
    );
  }
  
  bool get isFull => bookedCount >= capacity || status == 'FULL';
}
