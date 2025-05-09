const sql = require('mssql');
const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');

// Database configuration
const dbConfig = {
    user: "sa",
    password: "123456",
    server: "localhost",
    database: "TravelData",
    options: { encrypt: false, trustServerCertificate: true }
};

let pool;

async function connectDB() {
    try {
        if (!pool || !pool.connected) {
            pool = await sql.connect(dbConfig);
            console.log("✅ Kết nối SQL Server thành công");
        }
        return pool;
    } catch (err) {
        console.error("❌ Lỗi kết nối SQL Server:", err);
        pool = null;
        throw err;
    }
}

// Registration function
async function register(name, email, password) {
    try {
        if (!name || !email || !password) {
            return { success: false, message: 'Vui lòng điền đầy đủ thông tin' };
        }
        if (!validator.isEmail(email)) {
            return { success: false, message: 'Email không hợp lệ' };
        }
        if (password.length < 6) {
            return { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
        }

        const pool = await connectDB();
        let result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM TravelData WHERE UserEmail = @email');
        if (result.recordset.length > 0) {
            return { success: false, message: 'Email đã tồn tại' };
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .input('role', sql.NVarChar, 'guest')
            .input('otp', sql.NVarChar, otp)
            .input('expiresAt', sql.DateTime, expiresAt)
            .query(`
                INSERT INTO TravelData (UserName, UserEmail, UserPassword, UserRole, OTPCode, OTPExpiresAt)
                VALUES (@name, @email, @password, @role, @otp, @expiresAt)
            `);
        console.log(`OTP cho ${email}: ${otp}`);
        return { success: true, message: 'Đăng ký thành công, vui lòng xác thực OTP', otp };
    } catch (err) {
        console.error('Đăng ký thất bại:', err);
        return { success: false, message: 'Đăng ký thất bại' };
    }
}

// OTP Verification function for registration
async function verifyOTP(email, otp) {
    try {
        if (!email || !otp) {
            return { success: false, message: 'Vui lòng cung cấp email và OTP' };
        }
        if (!validator.isEmail(email)) {
            return { success: false, message: 'Email không hợp lệ' };
        }

        const pool = await connectDB();
        let result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .query(`
                SELECT * FROM TravelData 
                WHERE UserEmail = @email AND OTPCode = @otp AND OTPExpiresAt > GETDATE()
            `);
        if (result.recordset.length === 0) {
            return { success: false, message: 'OTP hoặc email không hợp lệ hoặc đã hết hạn' };
        }
        await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`
                UPDATE TravelData 
                SET OTPCode = NULL, OTPExpiresAt = NULL 
                WHERE UserEmail = @email
            `);
        return { success: true, message: 'Tài khoản đã được xác thực thành công' };
    } catch (err) {
        console.error('Xác thực OTP thất bại:', err);
        return { success: false, message: 'Xác thực OTP thất bại' };
    }
}

// Login function
async function login(email, password) {
    try {
        if (!email || !password) {
            return { success: false, message: 'Vui lòng cung cấp email và mật khẩu' };
        }
        if (!validator.isEmail(email)) {
            return { success: false, message: 'Email không hợp lệ' };
        }

        const pool = await connectDB();
        let result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`
                SELECT ID, UserName, UserEmail, UserPassword, UserRole 
                FROM TravelData 
                WHERE UserEmail = @email AND OTPCode IS NULL
            `);
        if (result.recordset.length === 0) {
            return { success: false, message: 'Người dùng không tồn tại hoặc chưa được xác thực' };
        }
        const user = result.recordset[0];
        const validPassword = await bcrypt.compare(password, user.UserPassword);
        if (!validPassword) {
            return { success: false, message: 'Mật khẩu không đúng' };
        }
        const token = jwt.sign({ id: user.ID, role: user.UserRole }, process.env.JWT_SECRET, { expiresIn: '3d' });
        return { success: true, message: 'Đăng nhập thành công', token, user: { id: user.ID, name: user.UserName, email: user.UserEmail, role: user.UserRole } };
    } catch (err) {
        console.error('Đăng nhập thất bại:', err);
        return { success: false, message: 'Đăng nhập thất bại' };
    }
}

// Forgot Password function
async function forgotPassword(email) {
    try {
        if (!email) {
            return { success: false, message: 'Vui lòng cung cấp email' };
        }
        if (!validator.isEmail(email)) {
            return { success: false, message: 'Email không hợp lệ' };
        }

        const pool = await connectDB();
        let result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM TravelData WHERE UserEmail = @email');
        if (result.recordset.length === 0) {
            return { success: false, message: 'Người dùng không tồn tại' };
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .input('expiresAt', sql.DateTime, expiresAt)
            .query(`
                UPDATE TravelData 
                SET OTPCode = @otp, OTPExpiresAt = @expiresAt 
                WHERE UserEmail = @email
            `);
        console.log(`OTP cho đặt lại mật khẩu ${email}: ${otp}`);
        return { success: true, message: 'OTP đã được gửi đến email', otp };
    } catch (err) {
        console.error('Quên mật khẩu thất bại:', err);
        return { success: false, message: 'Quên mật khẩu thất bại' };
    }
}

// Verify Forgot Password OTP
async function verifyForgotOTP(email, otp) {
    try {
        if (!email || !otp) {
            return { success: false, message: 'Vui lòng cung cấp email và OTP' };
        }
        if (!validator.isEmail(email)) {
            return { success: false, message: 'Email không hợp lệ' };
        }

        const pool = await connectDB();
        let result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .query(`
                SELECT ID FROM TravelData 
                WHERE UserEmail = @email AND OTPCode = @otp AND OTPExpiresAt > GETDATE()
            `);
        if (result.recordset.length === 0) {
            return { success: false, message: 'OTP hoặc email không hợp lệ hoặc đã hết hạn' };
        }
        const userID = result.recordset[0].ID;
        const resetToken = jwt.sign({ id: userID }, process.env.JWT_SECRET, { expiresIn: '10m' });
        await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`
                UPDATE TravelData 
                SET OTPCode = NULL, OTPExpiresAt = NULL 
                WHERE UserEmail = @email
            `);
        return { success: true, message: 'OTP đã được xác thực', resetToken };
    } catch (err) {
        console.error('Xác thực OTP quên mật khẩu thất bại:', err);
        return { success: false, message: 'Xác thực OTP thất bại' };
    }
}

// Reset Password function
async function resetPassword(email, resetToken, newPassword) {
    try {
        if (!email || !resetToken || !newPassword) {
            return { success: false, message: 'Vui lòng cung cấp email, token và mật khẩu mới' };
        }
        if (!validator.isEmail(email)) {
            return { success: false, message: 'Email không hợp lệ' };
        }
        if (newPassword.length < 6) {
            return { success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
        }

        const pool = await connectDB();
        let result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT ID FROM TravelData WHERE UserEmail = @email');
        if (result.recordset.length === 0) {
            return { success: false, message: 'Người dùng không tồn tại' };
        }
        const userID = result.recordset[0].ID;
        try {
            const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
            if (decoded.id !== userID) {
                return { success: false, message: 'Token không hợp lệ' };
            }
        } catch (err) {
            return { success: false, message: 'Token không hợp lệ hoặc đã hết hạn' };
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .query(`
                UPDATE TravelData 
                SET UserPassword = @password 
                WHERE UserEmail = @email
            `);
        return { success: true, message: 'Đặt lại mật khẩu thành công' };
    } catch (err) {
        console.error('Đặt lại mật khẩu thất bại:', err);
        return { success: false, message: 'Đặt lại mật khẩu thất bại' };
    }
}

module.exports = {
    register,
    verifyOTP,
    login,
    forgotPassword,
    verifyForgotOTP,
    resetPassword
};