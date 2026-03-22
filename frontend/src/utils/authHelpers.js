import { jwtDecode } from 'jwt-decode';

export const getRolesFromToken = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return [];
    try {
        const decoded = jwtDecode(token);
        return decoded.roles || [];
    } catch (error) {
        console.error("Token error", error);
        return [];
    }
};

export const getUserIdFromToken = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
        const decoded = jwtDecode(token);
        return decoded.user_id || decoded.sub || null;
    } catch (error) {
        return null;
    }
};

export const isAdminFromToken = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    try {
        const decoded = jwtDecode(token);
        return decoded.is_staff || decoded.is_superuser || (decoded.roles && decoded.roles.includes('Admin'));
    } catch (error) {
        return false;
    }
};

export const checkUserHasRole = (roleName) => {
    const roles = getRolesFromToken();
    return roles.includes(roleName);
};

export const checkUserHasAnyRole = (roleNamesArray) => {
    const roles = getRolesFromToken();
    return roleNamesArray.some(role => roles.includes(role));
};

export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
};

export const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
});
