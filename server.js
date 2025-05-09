const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const schedule = require("node-schedule");
const auth = require('./auth');
const jwt = require('jsonwebtoken');

// Middleware xác thực
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Không có token được cung cấp' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
};

// Khởi tạo app
const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "tuankiet")));

// Cấu hình SQL Server
const dbConfig = {
    user: "sa",
    password: "123456",
    server: "localhost",
    database: "TravelData",
    options: { encrypt: false, trustServerCertificate: true }
};

// Hàm kết nối SQL Server
async function getConnection() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log("✅ Kết nối SQL Server thành công");
        return pool;
    } catch (err) {
        console.error("❌ Lỗi kết nối SQL Server:", err);
        throw err;
    }
}

// Endpoint tìm kiếm
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q ? req.query.q : '';
        const pool = await getConnection();
        let result = await pool.request()
            .input('query', sql.NVarChar, query)
            .query(`
                SELECT DISTINCT LocationName AS name, LocationImageURL AS image, LocationDescription AS description 
                FROM TravelData 
                WHERE LocationName COLLATE Vietnamese_100_CI_AI LIKE '%' + @query + '%' AND LocationName IS NOT NULL
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi khi tìm kiếm:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Endpoint lấy danh sách khách sạn theo địa điểm
app.get('/hotels/:location', async (req, res) => {
    try {
        const locationName = req.params.location;
        const pool = await getConnection();
        let result = await pool.request()
            .input('locationName', sql.NVarChar, locationName)
            .query(`
                SELECT HotelName AS name, HotelImageURL AS image, HotelPrice AS price, HotelDescription AS description, HotelAmenities AS amenities 
                FROM TravelData 
                WHERE LocationName = @locationName AND HotelName IS NOT NULL
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi khi lấy khách sạn:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Đăng ký
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    const result = await auth.register(name, email, password);
    res.json(result);
});

// Xác thực OTP
app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const result = await auth.verifyOTP(email, otp);
    res.json(result);
});

// Đăng nhập
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await auth.login(email, password);
    res.json(result);
});

// Quên mật khẩu
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const result = await auth.forgotPassword(email);
    res.json(result);
});

// Xác thực OTP quên mật khẩu
app.post('/verify-forgot-otp', async (req, res) => {
    const { email, otp } = req.body;
    const result = await auth.verifyForgotOTP(email, otp);
    res.json(result);
});

// Đặt lại mật khẩu
app.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    const result = await auth.resetPassword(email, newPassword);
    res.json(result);
});

// Đặt phòng
app.post('/book', authenticate, async (req, res) => {
    try {
        const { location, hotelName, checkIn, checkOut, guestEmail } = req.body;
        if (!location || !hotelName || !checkIn || !checkOut || !guestEmail) {
            return res.status(400).json({ success: false, message: 'Thiếu các trường bắt buộc' });
        }
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (isNaN(checkInDate) || isNaN(checkOutDate)) {
            return res.status(400).json({ success: false, message: 'Định dạng ngày không hợp lệ' });
        }
        if (checkInDate >= checkOutDate) {
            return res.status(400).json({ success: false, message: 'Ngày nhận phòng phải trước ngày trả phòng' });
        }
        const pool = await getConnection();
        let hotelResult = await pool.request()
            .input('location', sql.NVarChar, location)
            .input('hotelName', sql.NVarChar, hotelName)
            .query('SELECT ID FROM TravelData WHERE LocationName = @location AND HotelName = @hotelName AND HotelName IS NOT NULL');
        if (hotelResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn' });
        }
        const hotelID = hotelResult.recordset[0].ID;
        await pool.request()
            .input('userID', sql.Int, req.user.id)
            .input('hotelID', sql.Int, hotelID)
            .input('checkIn', sql.Date, checkIn)
            .input('checkOut', sql.Date, checkOut)
            .input('guestEmail', sql.NVarChar, guestEmail)
            .query(`
                INSERT INTO Bookings (UserID, HotelID, CheckInDate, CheckOutDate, GuestEmail)
                VALUES (@userID, @hotelID, @checkIn, @checkOut, @guestEmail)
            `);
        res.json({ success: true, message: 'Đặt phòng thành công' });
    } catch (err) {
        console.error('Đặt phòng thất bại:', err);
        res.status(500).json({ success: false, message: 'Đặt phòng thất bại' });
    }
});

// Lấy danh sách đặt phòng của người dùng
app.get('/mybookings', authenticate, async (req, res) => {
    try {
        const pool = await getConnection();
        let result = await pool.request()
            .input('userID', sql.Int, req.user.id)
            .query(`
                SELECT b.BookingID, t.LocationName, t.HotelName, b.CheckInDate, b.CheckOutDate, b.GuestEmail, b.BookingDate, b.Status
                FROM Bookings b
                JOIN TravelData t ON b.HotelID = t.ID
                WHERE b.UserID = @userID
                ORDER BY b.BookingDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi khi lấy danh sách đặt phòng:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});
app.post('/save-plan', authenticate, async (req, res) => {
    try {
        const { locations } = req.body;
        const pool = await getConnection();
        const planResult = await pool.request()
            .input('userID', sql.Int, req.user.id)
            .query('INSERT INTO Plans (UserID) OUTPUT INSERTED.PlanID VALUES (@userID)');
        const planID = planResult.recordset[0].PlanID;
        for (const loc of locations) {
            await pool.request()
                .input('planID', sql.Int, planID)
                .input('locationName', sql.NVarChar, loc.location.name)
                .input('startDate', sql.Date, loc.startDate)
                .input('endDate', sql.Date, loc.endDate)
                .query('INSERT INTO PlanLocations (PlanID, LocationName, StartDate, EndDate) VALUES (@planID, @locationName, @startDate, @endDate)');
        }
        res.json({ success: true, message: 'Lưu kế hoạch thành công' });
    } catch (err) {
        console.error('Lưu kế hoạch thất bại:', err);
        res.status(500).json({ success: false, message: 'Lưu kế hoạch thất bại' });
    }
});
// Thiết lập JWT_SECRET (cho phát triển)
process.env.JWT_SECRET = 'your_secret_key';

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server chạy ở port ${PORT}`);
});