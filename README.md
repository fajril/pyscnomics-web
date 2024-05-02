# PySCnomicsApp
It's an application for economic calculation
## Setup for Windows
 ### Requirements
  - Python 3.11
  - [pnpm](https://pnpm.io/installation)


 ### Backend (FastAPI)
 create environtment
    
    python -m pip install virtualenv
    python -m venv fastapi-env --copies
 Activate environtment
  
  for powershell

    fastapi-env\\Scripts\\activate.ps1
  for cmd
    
    fastapi-env\\Scripts\\activate.bat
 Install requirements
 
    pip install -r requirements.txt
    
 ### Frontend (VueJS)

 install node modules

    cd vue-src
    pnpm install

  Development

  running on localhost:5173
    
    pnpm dev

  Production

  Install to static path

    pnpm build
  
 
