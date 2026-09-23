import os
import zipfile

zip_path = os.path.join(os.getcwd(), "static", "TourManager-Desktop-App.zip")
app_url = "https://ais-dev-zshgfqgwkis6gglqtqvqvg-627035250074.asia-east1.run.app"

bat_content = f"""@echo off
title TourManager Desktop App
echo ========================================================
echo Launching TourManager Desktop Application...
echo ========================================================
start msedge --app="{app_url}" 2>nul || start chrome --app="{app_url}" 2>nul || start "" "{app_url}"
exit
"""

url_content = f"""[InternetShortcut]
URL={app_url}
IconIndex=0
"""

mac_content = f"""#!/bin/bash
open -a "Google Chrome" --args --app="{app_url}" 2>/dev/null || open "{app_url}"
"""

linux_content = f"""#!/bin/bash
google-chrome --app="{app_url}" 2>/dev/null || microsoft-edge --app="{app_url}" 2>/dev/null || xdg-open "{app_url}"
"""

readme_content = f"""==============================================================
TourManager Desktop Application Launcher
==============================================================

Enjoy 1-click standalone desktop access to TourManager:

ON WINDOWS (Laptops & Desktops):
1. Double-click "Launch-TourManager-Windows.bat" OR "TourManager.url".
2. TourManager opens instantly in a dedicated app window.
3. You can copy this file to your Windows Desktop for quick access anytime!

ON MAC (MacBook, iMac):
1. Double-click "Launch-TourManager-Mac.command".

ON LINUX:
1. Run "./TourManager-Linux.sh".

Direct Web App URL:
{app_url}
"""

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("TourManager-Windows-Launcher.bat", bat_content)
    zf.writestr("TourManager.url", url_content)
    zf.writestr("TourManager-Mac-Launcher.command", mac_content)
    zf.writestr("TourManager-Linux-Launcher.sh", linux_content)
    zf.writestr("README.txt", readme_content)

print(f"Created {zip_path} successfully ({os.path.getsize(zip_path)} bytes)")
