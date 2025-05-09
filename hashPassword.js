const bcrypt = require('bcrypt');

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(`Mật khẩu gốc: ${password}, Mật khẩu mã hóa: ${hashedPassword}`);
}

hashPassword('guest123');
hashPassword('manager123');
hashPassword('admin123');