# PostgreSQL Setup Guide for ScanExpiry

## 1. INSTALL PostgreSQL

### Windows:

- Download: https://www.postgresql.org/download/windows/
- Run installer, accept defaults
- **IMPORTANT**: Remember the password you set for user `postgres`
- PostgreSQL will run on port 5432 (default)

### macOS:

```bash
brew install postgresql
brew services start postgresql
```

### Linux (Ubuntu/Debian):

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

---

## 2. CREATE DATABASE

After PostgreSQL is installed and running, open terminal/PowerShell:

### Option A: Using psql (Command Line)

```bash
# Connect to PostgreSQL as admin
psql -U postgres

# In psql, run:
CREATE DATABASE scanexpiry;
```

### Option B: Using pgAdmin (GUI)

1. Open pgAdmin (installed with PostgreSQL)
2. Right-click "Databases" → "Create" → "Database"
3. Name it: `scanexpiry`
4. Click "Save"

---

## 3. LOAD DATABASE SCHEMA

Run the schema file to create all tables:

```bash
# Windows PowerShell:
psql -U postgres -d scanexpiry -f "c:\important\mine\projects\ScanExpiry\backend\sql\schema.sql"

# macOS/Linux:
psql -U postgres -d scanexpiry -f /path/to/ScanExpiry/backend/sql/schema.sql
```

Or manually in psql:

```bash
psql -U postgres -d scanexpiry

# Then paste the entire contents of backend/sql/schema.sql
# Tables will be created: users, products, scans, alerts, reports
```

---

## 4. VERIFY DATABASE

Check that tables were created:

```bash
psql -U postgres -d scanexpiry -c "\dt"
```

You should see:

```
 public | alerts    | table
 public | products  | table
 public | reports   | table
 public | scans     | table
 public | users     | table
```

---

## 5. UPDATE .env FILE

Edit `backend/.env`:

```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/scanexpiry
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
PORT=4001
```

**Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation**

---

## 6. START BACKEND (REMOVE DEMO MODE)

Stop the current backend and restart without `USE_DEMO`:

```bash
cd c:\important\mine\projects\ScanExpiry\backend
npm run dev
```

Backend will now use real PostgreSQL database!

---

## 7. TEST CONNECTION

Try registering a new account in the app:

- Go to http://localhost:5174/register
- Fill form and submit
- If succeeds → Database is connected ✅

---

## TROUBLESHOOTING

### "psql: command not found"

- PostgreSQL not in PATH
- Add to PATH: `C:\Program Files\PostgreSQL\15\bin` (Windows)

### "FATAL: role 'postgres' does not exist"

- PostgreSQL not initialized properly
- Reinstall PostgreSQL and note the password

### "FATAL: password authentication failed"

- Wrong password in .env
- Check the password you set during installation

### "FATAL: database 'scanexpiry' does not exist"

- Run: `psql -U postgres -c "CREATE DATABASE scanexpiry;"`

### Connection timeout

- PostgreSQL not running
- Windows: Check Services (postgresql-x64-15)
- macOS: Run `brew services start postgresql`
- Linux: Run `sudo service postgresql start`

---

## DATABASE BACKUP & RESTORE

### Backup:

```bash
pg_dump -U postgres scanexpiry > backup.sql
```

### Restore:

```bash
psql -U postgres -d scanexpiry < backup.sql
```

---

## STOP/START PostgreSQL

### Windows:

```powershell
# Start
net start postgresql-x64-15

# Stop
net stop postgresql-x64-15
```

### macOS:

```bash
brew services start postgresql
brew services stop postgresql
```

### Linux:

```bash
sudo service postgresql start
sudo service postgresql stop
```
