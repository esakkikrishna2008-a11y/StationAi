export const calculateExpiryStatus = (expiryDate, expiryTracking) => {
    if (!expiryTracking) return 'NOT APPLICABLE';
    if (!expiryDate) return 'NO DATA';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);

    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'EXPIRED';
    if (diffDays <= 7) return 'CRITICAL';
    if (diffDays <= 30) return 'EXPIRING SOON';
    return 'SAFE';
};

export const getDaysRemaining = (expiryDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
};

export const getExpiryText = (daysRemaining) => {
    if (daysRemaining < 0) return `Expired ${Math.abs(daysRemaining)} days ago`;
    if (daysRemaining === 0) return "Expires today";
    if (daysRemaining === 1) return "Expires tomorrow";
    if (daysRemaining <= 30) return `Expires in ${daysRemaining} days`;
    return `${daysRemaining} days remaining`;
};
