@echo off
chcp 65001 >nul
echo ==================================================
echo    TOOL TỰ ĐỘNG ĐẨY MÃ NGUỒN VÀ TĂNG VERSION QLVB
echo ==================================================

echo.
echo [1/3] Đang tu dong tang phien ban...
cd frontend
call npm version patch
cd ..

echo.
echo [2/3] Dang lay so phien ban moi nhat...
FOR /F "tokens=*" %%g IN ('node -p "require('./frontend/package.json').version"') do (SET NEW_VERSION=%%g)
echo - Phien ban moi: v%NEW_VERSION%

echo.
echo [3/3] Dang day ma nguon len GitHub...
git add .
git commit -m "chore: phat hanh ban v%NEW_VERSION% tu dong tu local"
git push origin master

echo.
echo ==================================================
echo HOAN TAT! MA NGUON V%NEW_VERSION% DA NAM TREN SERVER GITHUB.
echo ==================================================
echo Bay gio ban hay vao phan Cai dat tren Web (voi tu cach Admin)
echo Va bam nut "Bat dau Cap nhat" de server thuc thi viec tai code.
echo.
pause
