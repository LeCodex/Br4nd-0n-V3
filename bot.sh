#!/bin/sh
while [true]; do
    git fetch -ap
    git reset --hard origin/HEAD
    npm run dev
end