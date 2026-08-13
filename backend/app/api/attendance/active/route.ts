import { getActiveAttendanceSession } from '../../../../services/attendanceApi';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  return getActiveAttendanceSession(request);
}
