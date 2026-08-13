import { markTeacherAttendance } from '../../../../services/attendanceApi';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return markTeacherAttendance(request);
}
