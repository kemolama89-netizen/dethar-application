package com.dithar.app.contentreview

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** The review export's file name: never a path, never hidden, plain characters only. */
class ExportFileNameTest {
    @Test
    fun plainNamesPass() {
        assertEquals("dithar-content-review.csv", ExportFileName.safe("dithar-content-review.csv"))
        assertEquals("dithar-content-review.json", ExportFileName.safe("dithar-content-review.json"))
    }

    @Test
    fun pathsAreReducedToTheirNameAndUnsafeNamesRefused() {
        assertEquals("x.csv", ExportFileName.safe("../../x.csv"))
        assertNull(ExportFileName.safe(".hidden"))
        assertNull(ExportFileName.safe("a b.csv"))
        assertNull(ExportFileName.safe(""))
        assertNull(ExportFileName.safe(null))
    }
}
