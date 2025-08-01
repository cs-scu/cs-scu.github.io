// src/assets/js/modules/supabaseClient.js (نسخه اصلاح شده)

// از کتابخانه سراسری سوپابیس، فقط تابع createClient را بیرون می‌کشیم
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// این آدرس URL پروژه شماست
const supabaseUrl = 'https://vgecvbadhoxijspowemu.supabase.co';

// کلید عمومی (anon key) شما
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZWN2YmFkaG94aWpzcG93ZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDI5MjksImV4cCI6MjA2OTAxODkyOX0.4XW_7NUcidoa9nOGO5BrJvreITjg-vuUzsQbSH87eaU';

// حالا با استفاده از تابع createClient، کلاینت خودمان را می‌سازیم و آن را با نام supabase اکسپورت می‌کنیم
export const supabase = createClient(supabaseUrl, supabaseKey);