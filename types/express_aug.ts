import { JwtPayload } from '../utils/token';

declare global {
    namespace Express {
        interface Request {
            user: JwtPayload;
        }
    }
}