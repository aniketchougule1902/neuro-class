import { correctAttendance } from '../../../../services/attendanceApi';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return correctAttendance(request);
}
