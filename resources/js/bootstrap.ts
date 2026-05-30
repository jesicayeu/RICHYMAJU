import axios from 'axios';
import { initTheme } from '@/lib/theme';

initTheme();

window.axios = axios;
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
