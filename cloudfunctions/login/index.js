// 云函数模板
// 部署：在 cloud-functions/login 文件夹右击选择 "上传并部署"

const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
})

/**
 * 云函数入口函数
 *
 * @param event 事件参数
 * @param context 上下文
 * @return 返回结果
 */
exports.main = async (event, context) => {
	// 获取 WX Context (微信调用上下文)，包括 OPENID、APPID 等信息
	const wxContext = cloud.getWXContext()

	return {
		event,
		openid: wxContext.OPENID,
		appid: wxContext.APPID,
		unionid: wxContext.UNIONID,
	}
}
