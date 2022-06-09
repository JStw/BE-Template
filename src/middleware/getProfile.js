
const getProfile = async (req, res, next) => {
    const {Profile} = req.app.get('models')
    const profile = await Profile.findOne({where: {id: req.get('profile_id') || 0}})
    if(!profile) return res.status(401).end()
    req.profile = profile
    next()
}

const getAdminProfile = async (req, res, next) => {
    await getProfile(req, res, () => {
        if (req.profile.type !== 'contractor') return res.status(401).end()
        next();
    });
}
module.exports = {getProfile, getAdminProfile}
