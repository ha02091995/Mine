class ScheduledReminder {
  ScheduledReminder(this.id, this.title, this.when);
  final String id;
  final String title;
  final DateTime when;
}

abstract class ReminderScheduler {
  Future<void> schedule(ScheduledReminder reminder);
}

class MemoryReminderScheduler implements ReminderScheduler {
  final items = <ScheduledReminder>[];

  @override
  Future<void> schedule(ScheduledReminder reminder) async {
    items.add(reminder);
  }
}
