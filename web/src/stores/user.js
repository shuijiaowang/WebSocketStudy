import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { login } from '@/api/user'
import { ElLoading, ElMessage } from 'element-plus'
import router from '@/router'

export const useUserStore = defineStore('user', () => {
    // 状态管理（仅保留username和uuid）
    const token = useStorage('token', '')
    const userInfo = ref({
        username: '',  // 仅保留用户名
        uuid: ''       // 仅保留uuid
    })

    // 设置用户信息（只处理username和uuid）
    const setUserInfo = (info) => {
        userInfo.value = {
            username: info.username || userInfo.value.username,
            uuid: info.uuid || userInfo.value.uuid
        }
    }

    // 设置token
    const setToken = (newToken) => {
        token.value = newToken
    }

    // 清理用户状态（仅重置保留的字段）
    const clearUserState = () => {
        token.value = ''
        userInfo.value = {
            username: '',
            uuid: ''
        }
    }

    // 登录逻辑（适配精简后的用户信息）
    const loginIn = async (loginForm) => {
        const loading = ElLoading.service({
            fullscreen: true,
            text: '登录中...'
        })

        try {
            // 验证表单
            if (!loginForm.username || !loginForm.password) {
                ElMessage.warning('请输入用户名和密码')
                return false
            }

            // 调用登录接口
            const res = await login(loginForm)
            if (res.code !== 0) {
                return false
            }

            // 保存用户信息（从响应data中直接获取username和uuid）
            setToken(res.data.token)
            setUserInfo({
                username: res.data.username,
                uuid: res.data.uuid
            })

            // 直接跳转首页（不再依赖authority字段）
            const targetRoute = 'home'
            if (router.hasRoute(targetRoute)) {
                await router.replace({ name: targetRoute })
                console.log("为什么不跳转？")
            } else {
                ElMessage.error('首页路由不存在，请联系管理员')
                return false
            }

            ElMessage.success('登录成功')
            return true
        } catch (error) {
            console.error('登录失败:', error)
            return false
        } finally {
            loading.close()
        }
    }

    // 退出登录
    const logout = async () => {
        clearUserState()
        await router.replace({ name: 'login' })
        ElMessage.success('已退出登录')
    }
    // 补充到useUserStore中
    const parseTokenAndSetUserInfo = () => {
        if (!token.value) return; // 没有token则直接返回

        try {
            // 拆分JWT（header.payload.signature）
            const tokenParts = token.value.split('.');
            if (tokenParts.length !== 3) {
                throw new Error('无效的token格式');
            }

            // 解析payload部分（Base64Url解码）
            const payloadBase64 = tokenParts[1]
                .replace(/-/g, '+') // 替换Base64Url中的-为+
                .replace(/_/g, '/'); // 替换Base64Url中的_为/

            // 处理Base64填充（如果长度不是4的倍数，补充=）
            const paddingLength = 4 - (payloadBase64.length % 4);
            const payloadBase64WithPadding = paddingLength < 4
                ? payloadBase64 + '='.repeat(paddingLength)
                : payloadBase64;

            // 解码并转换为JSON
            const payloadJson = decodeURIComponent(
                atob(payloadBase64WithPadding)
                    .split('')
                    .map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            const payload = JSON.parse(payloadJson);

            // 从payload中提取用户信息（对应之前解析的token结构：username和user_uuid）
            setUserInfo({
                username: payload.username || userInfo.value.username,
                uuid: payload.uuid || userInfo.value.uuid // token中是user_uuid，对应store的uuid
            });

            console.log('token解析成功，已更新用户信息');
        } catch (error) {
            console.error('token解析失败:', error);
            // 解析失败可选择清空无效token（根据业务需求）
            // clearUserState();
        }
    };

    return {
        token,
        userInfo,
        setUserInfo,
        setToken,
        clearUserState,
        loginIn,
        logout,
        parseTokenAndSetUserInfo
    }
})