process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://lovebyte:lovebyte@127.0.0.1:5432/lovebyte_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379/1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.OTP_LOG_CODE = 'true';
process.env.JWT_ACCESS_TTL = '900';
process.env.MEDIA_DIR = process.env.MEDIA_DIR || '/tmp/lovebyte-media-test';
process.env.MEDIA_SECRET = process.env.MEDIA_SECRET || 'test-media-secret';
