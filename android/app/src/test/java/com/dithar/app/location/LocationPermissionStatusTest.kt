package com.dithar.app.location

import com.dithar.app.location.LocationPermissionPlugin.Companion.resolveStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class LocationPermissionStatusTest {
    @Test
    fun grantedWinsRegardlessOfHistory() {
        assertEquals("granted", resolveStatus(granted = true, canShowRationale = false, requestedBefore = true))
    }

    @Test
    fun neverAskedShowsTheAndroidDialog() {
        assertEquals("prompt", resolveStatus(granted = false, canShowRationale = false, requestedBefore = false))
    }

    @Test
    fun deniedOnceCanBeAskedAgain() {
        assertEquals("prompt", resolveStatus(granted = false, canShowRationale = true, requestedBefore = true))
        assertEquals("prompt", resolveStatus(granted = false, canShowRationale = true, requestedBefore = false))
    }

    @Test
    fun deniedWithoutRationaleAfterOurRequestIsBlocked() {
        // Android no longer shows the dialog — the app must send the user to Settings, not ask again.
        assertEquals("blocked", resolveStatus(granted = false, canShowRationale = false, requestedBefore = true))
    }
}
