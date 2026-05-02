package com.financetracker.backend.service;

import com.financetracker.backend.dto.AuthResponse;
import com.financetracker.backend.dto.LoginRequest;
import com.financetracker.backend.dto.SignupRequest;
import com.financetracker.backend.entity.User;
import com.financetracker.backend.exception.ConflictException;
import com.financetracker.backend.exception.UnauthorizedException;
import com.financetracker.backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse signup(SignupRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists");
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setAuthToken(generateToken());
        user.setCreatedAt(LocalDateTime.now());
        User savedUser = userRepository.save(user);
        return toAuthResponse(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        user.setAuthToken(generateToken());
        User savedUser = userRepository.save(user);
        return toAuthResponse(savedUser);
    }

    public User getAuthenticatedUser(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new UnauthorizedException("Login is required");
        }

        String token = authorizationHeader.replace("Bearer", "").trim();
        if (token.isBlank()) {
            throw new UnauthorizedException("Invalid token");
        }

        return userRepository.findByAuthToken(token)
            .orElseThrow(() -> new UnauthorizedException("Session expired or invalid token"));
    }

    private AuthResponse toAuthResponse(User user) {
        return new AuthResponse(user.getAuthToken(), user.getId(), user.getName(), user.getEmail());
    }

    private String generateToken() {
        return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }
}
