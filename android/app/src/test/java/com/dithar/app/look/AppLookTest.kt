package com.dithar.app.look

import org.junit.Assert.assertEquals
import org.junit.Test

class AppLookTest {
    private fun minutes(h: Int, m: Int) = h * 60 + m

    @Test
    fun `without automatic dark mode the chosen look shows`() {
        assertEquals("nature", AppLook.effective("nature", "off", deviceDark = true, minutesOfDay = minutes(23, 0)))
    }

    @Test
    fun `device mode follows the phone`() {
        assertEquals("night", AppLook.effective("sunset", "device", deviceDark = true, minutesOfDay = minutes(12, 0)))
        assertEquals("sunset", AppLook.effective("sunset", "device", deviceDark = false, minutesOfDay = minutes(23, 0)))
    }

    @Test
    fun `time mode is night from 18 30 until 05 30`() {
        assertEquals("classic", AppLook.effective("classic", "time", false, minutes(18, 29)))
        assertEquals("night", AppLook.effective("classic", "time", false, minutes(18, 30)))
        assertEquals("night", AppLook.effective("classic", "time", false, minutes(5, 29)))
        assertEquals("classic", AppLook.effective("classic", "time", false, minutes(5, 30)))
    }

    @Test
    fun `an unknown look falls back to classic`() {
        assertEquals("classic", AppLook.effective("women", "off", false, 0))
        assertEquals(AppLook.colors("classic"), AppLook.colors("women"))
    }
}
