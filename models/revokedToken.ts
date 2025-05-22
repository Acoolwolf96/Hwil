import mongoose from 'mongoose';

const revokedTokenSchema = new mongoose.Schema({
    jti: {
        type: String,
        required: true,
        unique: true,
    },
    revokedAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('RevokedToken', revokedTokenSchema);