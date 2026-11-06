/**
 * Defines and validates the credentials submitted by the frontend.
 * The identifier can be either a username or institutional email.
 **/

package com.edward.pensioncompliance.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(

    @NotBlank(message = "Username or email is required")
    @Size(max = 254, message = "Identifier too long.")
    String identifier,

    @NotBlank(message = "Password is required")
    @Size(max = 128, message = "Password is too long.")
    String password

) {}