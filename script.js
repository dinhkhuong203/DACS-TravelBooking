// Dữ liệu giả lập địa điểm và khách sạn
const locations = [
    { name: "Hà Nội", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1932&auto=format&fit=crop", description: "Trái tim Việt Nam", hotels: [
        { name: "Khách sạn Hà Nội Vàng", price: "1.500.000 VNĐ/đêm", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop" },
        { name: "Khách sạn Thăng Long", price: "1.200.000 VNĐ/đêm", image: "https://images.unsplash.com/photo-1564501049412-37c5b6b7e76e?q=80&w=2070&auto=format&fit=crop" }
    ]},
    { name: "Đà Nẵng", image: "https://images.unsplash.com/photo-1565967511747-25f9e21c1a63?q=80&w=1974&auto=format&fit=crop", description: "Thành phố đáng sống", hotels: [
        { name: "Khách sạn Biển Xanh", price: "1.800.000 VNĐ/đêm", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop" }
    ]},
    { name: "TP.HCM", image: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=2070&auto=format&fit=crop", description: "Thành phố sôi động", hotels: [
        { name: "Khách sạn Sài Gòn", price: "2.000.000 VNĐ/đêm", image: "https://images.unsplash.com/photo-1564501049412-37c5b6b7e76e?q=80&w=2070&auto=format&fit=crop" }
    ]},
    { name: "Phú Quốc", image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=1974&auto=format&fit=crop", description: "Thiên đường biển", hotels: []}
];

// Biến tạm để lưu OTP và thông tin
let tempRegisterData = null;
let generatedOTP = null;
let tempForgotEmail = null;

// Tìm kiếm địa điểm
function searchLocation() {
    const search = document.getElementById('search').value.toLowerCase();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const guests = document.getElementById('guests').value;

    if (!search || !checkIn || !checkOut || !guests) {
        alert('Vui lòng nhập đầy đủ thông tin tìm kiếm!');
        return;
    }

    console.log("Từ khóa tìm kiếm:", search);
    const results = locations.filter(loc => loc.name.toLowerCase().includes(search));
    console.log("Kết quả tìm kiếm:", results);
    
    document.getElementById('results').innerHTML = results.length > 0 
        ? results.map(item => `
            <div class="result-card d-flex align-items-center p-3 mb-2 border rounded" onclick="showHotels('${item.name}')">
                <img src="${item.image}" alt="${item.name}" class="result-image me-3">
                <div>
                    <h6 class="mb-1">${item.name}</h6>
                    <p class="mb-0 text-muted">${item.description}</p>
                </div>
            </div>
        `).join('')
        : `<p class="p-2">Không tìm thấy kết quả cho: ${search}</p>`;
}

// Hiển thị khách sạn
function showHotels(city) {
    const location = locations.find(loc => loc.name === city);
    document.getElementById('results').innerHTML = location.hotels.length > 0 
        ? `<h5 class="mb-3">Khách sạn tại ${city}</h5>` + location.hotels.map(hotel => `
            <div class="result-card d-flex align-items-center p-3 mb-2 border rounded">
                <img src="${hotel.image}" alt="${hotel.name}" class="result-image me-3">
                <div>
                    <h6 class="mb-1">${hotel.name}</h6>
                    <p class="mb-0 text-muted">${hotel.price}</p>
                </div>
            </div>
        `).join('')
        : `<p class="p-2">Chưa có khách sạn tại ${city}</p>`;
}

// Hiển thị cảm hứng du lịch
function loadInspiration() {
    document.getElementById('inspiration').innerHTML = locations.map(item => `
        <div class="col-md-3">
            <div class="inspiration-card">
                <img src="${item.image}" alt="${item.name}">
                <h5>${item.name} - ${item.description}</h5>
            </div>
        </div>
    `).join('');
}

loadInspiration();

// Gửi mã OTP (Đăng ký)
function sendOTP() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        alert('Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    if (password !== confirmPassword) {
        alert('Mật khẩu xác nhận không khớp!');
        return;
    }

    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    tempRegisterData = { name, email, password, role: "guest" };

    alert(`Mã OTP đã được gửi đến ${email}: ${generatedOTP}`);
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('otpForm').style.display = 'block';
}

// Xác thực OTP (Đăng ký)
function verifyOTP() {
    const otp = document.getElementById('otpCode').value;
    if (otp === generatedOTP) {
        users.push(tempRegisterData);
        alert('Xác thực thành công! Tài khoản đã được tạo.');
        tempRegisterData = null;
        generatedOTP = null;
        showLogin();
    } else {
        alert('Mã OTP không đúng!');
    }
}

// Đăng nhập
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('token', data.token);
            alert('Đăng nhập thành công');
            const role = data.user.role;
            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else if (role === 'manager') {
                window.location.href = 'manager.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Lỗi:', err);
        alert('Đăng nhập thất bại');
    }
}

// Quên mật khẩu - Gửi OTP
function sendForgotPasswordOTP() {
    const email = document.getElementById('forgotEmail').value;
    const user = users.find(u => u.email === email);

    if (!user) {
        alert('Email không tồn tại!');
        return;
    }

    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    tempForgotEmail = email;

    alert(`Mã OTP đã được gửi đến ${email}: ${generatedOTP}`);
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('forgotPasswordOTPForm').style.display = 'block';
}

// Quên mật khẩu - Xác thực OTP
function verifyForgotPasswordOTP() {
    const otp = document.getElementById('forgotOtpCode').value;
    if (otp === generatedOTP) {
        document.getElementById('forgotPasswordOTPForm').style.display = 'none';
        document.getElementById('resetPasswordForm').style.display = 'block';
    } else {
        alert('Mã OTP không đúng!');
    }
}

// Quên mật khẩu - Đặt lại mật khẩu
function resetPassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (!newPassword || !confirmNewPassword) {
        alert('Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    if (newPassword !== confirmNewPassword) {
        alert('Mật khẩu xác nhận không khớp!');
        return;
    }

    const userIndex = users.findIndex(u => u.email === tempForgotEmail);
    if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        alert('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
        tempForgotEmail = null;
        generatedOTP = null;
        showLogin();
    }
}

// Chuyển đổi form
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('otpForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('forgotPasswordOTPForm').style.display = 'none';
    document.getElementById('resetPasswordForm').style.display = 'none';
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector('.auth-tab[onclick="showLogin()"]').classList.add('active');
}

// Đặt phòng
async function bookHotel() {
    const hotelName = document.getElementById('hotelName').value;
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const guestEmail = document.getElementById('guestEmail').value;
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Vui lòng đăng nhập trước');
        return;
    }

    try {
        const response = await fetch('/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ hotelName, checkIn, checkOut, guestEmail })
        });
        const data = await response.json();
        if (data.success) {
            alert('Đặt phòng thành công');
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error('Lỗi:', err);
        alert('Đặt phòng thất bại');
    }
}

// Chức năng lập kế hoạch du lịch
let plan = [];

async function addPlan() {
    const locationInput = document.getElementById('location').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!locationInput || !startDate || !endDate) {
        alert('Vui lòng nhập đầy đủ thông tin');
        return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
        alert('Ngày đi phải trước ngày về');
        return;
    }

    try {
        const response = await fetch(`/search?q=${encodeURIComponent(locationInput)}`);
        const locations = await response.json();
        const exactMatch = locations.find(loc => loc.name.toLowerCase() === locationInput.toLowerCase());
        if (!exactMatch) {
            alert('Địa điểm không tồn tại');
            return;
        }
        const planEntry = {
            location: exactMatch,
            startDate,
            endDate
        };
        plan.push(planEntry);
        displayPlan();
    } catch (err) {
        console.error('Lỗi:', err);
        alert('Có lỗi xảy ra');
    }
}

function displayPlan() {
    const planList = document.getElementById('planList');
    planList.innerHTML = plan.map((entry, index) => `
        <div class="plan-item mb-3 p-3 border rounded">
            <h5>${entry.location.name}</h5>
            <p>Ngày đi: ${entry.startDate}</p>
            <p>Ngày về: ${entry.endDate}</p>
            <img src="${entry.location.image}" alt="${entry.location.name}" class="img-fluid mb-2">
            <p>${entry.location.description}</p>
            <button onclick="removeFromPlan(${index})" class="btn btn-danger btn-sm">Xóa</button>
        </div>
    `).join('');
}

function removeFromPlan(index) {
    plan.splice(index, 1);
    displayPlan();
}