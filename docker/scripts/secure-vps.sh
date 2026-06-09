#!/bin/bash
# =============================================================================
# secure-vps.sh — Setup keamanan dasar VPS (Ubuntu 20.04)
#
# Cara pakai (pertama kali login sebagai root):
#   bash docker/scripts/secure-vps.sh
#
# Yang dilakukan script ini:
#   1. Update sistem
#   2. Buat user non-root
#   3. Setup SSH key + ganti port SSH
#   4. Konfigurasi firewall (UFW)
#   5. Install & konfigurasi Fail2Ban
#   6. Hardening SSH
#   7. Install Docker
# =============================================================================
set -e

# ── Warna output ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pastikan dijalankan sebagai root ──────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    error "Jalankan script ini sebagai root: sudo bash secure-vps.sh"
fi

echo ""
echo "======================================================"
echo "  EventManagement — VPS Security Setup"
echo "  OS: Ubuntu 20.04"
echo "======================================================"
echo ""

# ── Input konfigurasi ─────────────────────────────────────────────────────────
read -p "Masukkan username baru (contoh: deploy): " NEW_USER
read -p "Masukkan SSH port baru (default: 2222): " SSH_PORT
SSH_PORT=${SSH_PORT:-2222}

echo ""
warning "Pastikan kamu sudah punya SSH public key!"
warning "Jika belum, buat dulu di komputer lokal:"
warning "  ssh-keygen -t ed25519 -C 'vps-eventmanagement'"
echo ""
read -p "Paste SSH public key kamu di sini: " SSH_PUB_KEY

if [ -z "$SSH_PUB_KEY" ]; then
    error "SSH public key tidak boleh kosong!"
fi

echo ""
info "Memulai setup keamanan VPS..."
echo ""

# ──────────────────────────────────────────────────────────────────────────────
# 1. Update sistem
# ──────────────────────────────────────────────────────────────────────────────
info "[1/7] Update & upgrade sistem..."
apt update -y && apt upgrade -y
apt install -y curl wget git ufw fail2ban unzip

# ──────────────────────────────────────────────────────────────────────────────
# 2. Buat user non-root
# ──────────────────────────────────────────────────────────────────────────────
info "[2/7] Membuat user: $NEW_USER..."

if id "$NEW_USER" &>/dev/null; then
    warning "User $NEW_USER sudah ada, skip..."
else
    adduser --disabled-password --gecos "" "$NEW_USER"
    usermod -aG sudo "$NEW_USER"
    info "User $NEW_USER berhasil dibuat & ditambahkan ke sudo"
fi

# Setup SSH key untuk user baru
USER_HOME="/home/$NEW_USER"
mkdir -p "$USER_HOME/.ssh"
echo "$SSH_PUB_KEY" > "$USER_HOME/.ssh/authorized_keys"
chmod 700 "$USER_HOME/.ssh"
chmod 600 "$USER_HOME/.ssh/authorized_keys"
chown -R "$NEW_USER:$NEW_USER" "$USER_HOME/.ssh"
info "SSH key berhasil dikonfigurasi untuk $NEW_USER"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Hardening SSH
# ──────────────────────────────────────────────────────────────────────────────
info "[3/7] Hardening konfigurasi SSH..."

# Backup config asli
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

cat > /etc/ssh/sshd_config << EOF
# ── EventManagement VPS SSH Config ──────────────────
Port $SSH_PORT
AddressFamily inet

# Keamanan
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Session
LoginGraceTime 30
MaxAuthTries 3
MaxSessions 5
ClientAliveInterval 300
ClientAliveCountMax 2

# Misc
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

# Validasi config SSH sebelum restart
sshd -t && systemctl restart ssh
info "SSH dikonfigurasi: port $SSH_PORT, login password dinonaktifkan"

# ──────────────────────────────────────────────────────────────────────────────
# 4. Firewall (UFW)
# ──────────────────────────────────────────────────────────────────────────────
info "[4/7] Konfigurasi firewall UFW..."

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

ufw allow "$SSH_PORT/tcp"   comment 'SSH'
ufw allow 80/tcp             comment 'HTTP'
ufw allow 443/tcp            comment 'HTTPS'

ufw --force enable
info "Firewall aktif. Port yang dibuka: $SSH_PORT (SSH), 80 (HTTP), 443 (HTTPS)"

# ──────────────────────────────────────────────────────────────────────────────
# 5. Fail2Ban
# ──────────────────────────────────────────────────────────────────────────────
info "[5/7] Konfigurasi Fail2Ban..."

cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8

[sshd]
enabled  = true
port     = $SSH_PORT
logpath  = %(sshd_log)s
backend  = %(sshd_backend)s
maxretry = 3
bantime  = 86400

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

systemctl enable fail2ban
systemctl restart fail2ban
info "Fail2Ban aktif: IP yang gagal login 3x akan di-ban 24 jam"

# ──────────────────────────────────────────────────────────────────────────────
# 6. Optimasi sistem untuk production
# ──────────────────────────────────────────────────────────────────────────────
info "[6/7] Optimasi sistem..."

# Tambah swap 1GB (cadangan kalau RAM hampir habis)
if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    info "Swap 1GB berhasil ditambahkan"
else
    warning "Swap sudah ada, skip..."
fi

# Optimasi swappiness (gunakan swap hanya kalau RAM benar-benar hampir habis)
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p > /dev/null 2>&1

# ──────────────────────────────────────────────────────────────────────────────
# 7. Install Docker
# ──────────────────────────────────────────────────────────────────────────────
info "[7/7] Install Docker..."

if command -v docker &> /dev/null; then
    warning "Docker sudah terinstall, skip..."
else
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker "$NEW_USER"
    systemctl enable docker
    info "Docker berhasil diinstall"
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    apt install -y docker-compose-plugin
    info "Docker Compose plugin berhasil diinstall"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Selesai
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo -e "  ${GREEN}Setup keamanan VPS selesai!${NC}"
echo "======================================================"
echo ""
echo "  ⚠️  PENTING — Simpan info ini:"
echo ""
echo "  User baru  : $NEW_USER"
echo "  SSH port   : $SSH_PORT"
echo ""
echo "  Cara login setelah ini:"
echo "  ssh -p $SSH_PORT $NEW_USER@$(curl -s ifconfig.me 2>/dev/null || echo 'IP_VPS')"
echo ""
echo "  Langkah selanjutnya:"
echo "  1. Buka terminal BARU, test login dengan user $NEW_USER"
echo "  2. Jangan tutup sesi ini sampai login baru berhasil!"
echo "  3. Setelah berhasil login, clone repo & jalankan deploy.sh"
echo ""
echo "  git clone <url-repo> /var/www/EventManagement"
echo "  cd /var/www/EventManagement"
echo "  cp .env.example .env && nano .env"
echo "  bash docker/scripts/deploy.sh"
echo "======================================================"
