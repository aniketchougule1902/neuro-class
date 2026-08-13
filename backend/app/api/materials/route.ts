import { listClassroomMaterials, uploadClassroomMaterial } from '../../../services/materialApi';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return uploadClassroomMaterial(request);
}

export async function GET(request: Request): Promise<Response> {
  return listClassroomMaterials(request);
}
