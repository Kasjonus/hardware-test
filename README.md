# Hardware test

Software for hardware testing.

## Requriements
- linux
  - upower (for batteries detect)
  - lshw (for graphics detect)
  - smartmontools (for S.M.A.R.T. status)

## Commands:
- ### install packages
        yarn | npm install

- ### start app
    - #### for normal user:
            yarn start | npm start
    - #### for root user (recommended):
            yarn startRoot | npm run startRoot

- ### build app
    - #### linux
            yarn build-lin | npm run build-lin
    - #### windows (not working propertly)
            yarn build-win | npm run build-win