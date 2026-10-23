const pad = (n: number) => String(n).padStart(2, '0');

/** (8, 5) -> "08:05" */
export const formatTime = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;

/** "08:05" -> { hour: 8, minute: 5 } */
export function parseTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

export const sortTimes = (times: string[]) => [...times].sort();
