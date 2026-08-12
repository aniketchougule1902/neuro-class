"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.isSupabaseConfigured = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
var isSupabaseConfigured = function () { return !!supabaseUrl && !!supabaseAnonKey; };
exports.isSupabaseConfigured = isSupabaseConfigured;
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Database sync will not work.');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
