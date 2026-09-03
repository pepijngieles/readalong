#!/usr/bin/env bash
cd "$(dirname "$0")"
php -S localhost:8765 router.php
