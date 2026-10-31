package com.dithar.app.orientation

import android.content.pm.ActivityInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class OrientationRequestTest {
    @Test
    fun `the reader's three requests map to Android's orientations`() {
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, OrientationRequest.of("landscape"))
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT, OrientationRequest.of("portrait"))
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, OrientationRequest.of("unlocked"))
    }

    @Test
    fun `anything else is refused`() {
        assertNull(OrientationRequest.of(null))
        assertNull(OrientationRequest.of("sideways"))
    }
}
