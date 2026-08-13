import { closeAttendanceSession, createAttendanceSession } from '../../../../services/attendanceApi';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return createAttendanceSession(request);
}

export async function PATCH(request: Request): Promise<Response> {
  return closeAttendanceSession(request);
}
